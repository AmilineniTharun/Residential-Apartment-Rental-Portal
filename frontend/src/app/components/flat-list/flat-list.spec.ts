import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlatList } from './flat-list';

describe('FlatList', () => {
  let component: FlatList;
  let fixture: ComponentFixture<FlatList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlatList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlatList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
