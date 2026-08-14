import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FossilService } from './fossil-service';

describe('FossilService', () => {
  let component: FossilService;
  let fixture: ComponentFixture<FossilService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FossilService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FossilService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
