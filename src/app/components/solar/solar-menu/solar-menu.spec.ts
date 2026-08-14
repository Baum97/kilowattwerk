import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolarMenu } from './solar-menu';

describe('SolarMenu', () => {
  let component: SolarMenu;
  let fixture: ComponentFixture<SolarMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolarMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolarMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
