import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fossil } from './fossil';

describe('Fossil', () => {
  let component: Fossil;
  let fixture: ComponentFixture<Fossil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fossil]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fossil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
